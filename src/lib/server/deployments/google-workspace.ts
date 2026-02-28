import { randomUUID } from "node:crypto";

import type { CanvasState } from "@/lib/contracts";

const SCRIPT_FILENAME = "Code";
const APPS_SCRIPT_API_BASE = "https://script.googleapis.com/v1";
const FORMS_API_BASE = "https://forms.googleapis.com/v1";
const SHEETS_API_BASE = "https://sheets.googleapis.com/v4";

export interface DeployWorkflowResult {
  form_id: string;
  spreadsheet_id: string;
  script_id: string;
}

export interface GoogleWorkspaceDeployer {
  deploy(input: {
    canvas_state: CanvasState;
    deployment_id: string;
  }): Promise<DeployWorkflowResult>;
}

type Fetcher = typeof fetch;

export function buildAppsScriptSource(input: {
  sheetId: string;
  headers: string[];
  formId: string;
}): string {
  const headersJson = JSON.stringify(input.headers);

  return `const SHEET_ID = "${input.sheetId}";
const FORM_ID = "${input.formId}";
const HEADERS = ${headersJson};

function onFormSubmit(e) {
  if (!e || !e.response) return;

  const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  const formResponse = e.response;
  const timestamp = formResponse.getTimestamp();
  const editUrl = formResponse.getEditResponseUrl();

  const responsesByTitle = {};
  const itemResponses = formResponse.getItemResponses();

  for (var i = 0; i < itemResponses.length; i++) {
    var itemResponse = itemResponses[i];
    var title = itemResponse.getItem().getTitle();
    var raw = itemResponse.getResponse();

    if (Array.isArray(raw)) {
      responsesByTitle[title] = raw.join(", ");
    } else if (raw === null || raw === undefined) {
      responsesByTitle[title] = "";
    } else {
      responsesByTitle[title] = String(raw);
    }
  }

  var row = HEADERS.map(function (header) {
    if (header === "Timestamp") return timestamp;
    if (header === "Edit Link") return editUrl;
    return responsesByTitle[header] || "";
  });

  sheet.appendRow(row);
}

function createSubmitTrigger() {
  ScriptApp.newTrigger("onFormSubmit")
    .forForm(FORM_ID)
    .onFormSubmit()
    .create();
}
`;
}

function toColumnLabel(index: number): string {
  let next = index;
  let label = "";
  while (next > 0) {
    const remainder = (next - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    next = Math.floor((next - 1) / 26);
  }
  return label;
}

function normalizeBearerToken(rawToken: string): string {
  if (rawToken.startsWith("Bearer ")) {
    return rawToken.slice("Bearer ".length).trim();
  }
  return rawToken.trim();
}

export function createMockGoogleWorkspaceDeployer(): GoogleWorkspaceDeployer {
  return {
    async deploy(input) {
      return {
        form_id: `form_${input.deployment_id}_${randomUUID().slice(0, 8)}`,
        spreadsheet_id: `sheet_${input.deployment_id}_${randomUUID().slice(0, 8)}`,
        script_id: `script_${input.deployment_id}_${randomUUID().slice(0, 8)}`
      };
    }
  };
}

function assertOk(response: Response, action: string): Promise<void> {
  if (response.ok) {
    return Promise.resolve();
  }

  return response.text().then((body) => {
    throw new Error(`${action} failed with ${response.status}: ${body}`);
  });
}

type FormField = CanvasState["form_fields"][number];

function buildFormQuestion(field: FormField): {
  questionItem: {
    question: Record<string, unknown>;
  };
} {
  switch (field.type) {
    case "PARAGRAPH":
      return {
        questionItem: {
          question: {
            required: field.required,
            textQuestion: {
              paragraph: true
            }
          }
        }
      };
    case "MULTIPLE_CHOICE":
      return {
        questionItem: {
          question: {
            required: field.required,
            choiceQuestion: {
              type: "RADIO",
              options: [
                { value: "Option 1" },
                { value: "Option 2" }
              ]
            }
          }
        }
      };
    case "DATE":
      return {
        questionItem: {
          question: {
            required: field.required,
            dateQuestion: {
              includeYear: true
            }
          }
        }
      };
    case "SHORT_TEXT":
    default:
      return {
        questionItem: {
          question: {
            required: field.required,
            textQuestion: {}
          }
        }
      };
  }
}

export function createGoogleWorkspaceDeployer(input: {
  accessToken: string;
  fetcher?: Fetcher;
}): GoogleWorkspaceDeployer {
  const token = normalizeBearerToken(input.accessToken);
  const fetcher = input.fetcher ?? fetch;

  async function callJson(
    url: string,
    init: RequestInit,
    action: string
  ): Promise<Record<string, unknown>> {
    const response = await fetcher(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });

    await assertOk(response, action);
    return (await response.json()) as Record<string, unknown>;
  }

  return {
    async deploy({ canvas_state }) {
      const formPayload = await callJson(
        `${FORMS_API_BASE}/forms`,
        {
          method: "POST",
          body: JSON.stringify({
            info: {
              title: canvas_state.process_name,
              documentTitle: canvas_state.process_name
            }
          })
        },
        "create_form"
      );
      const formId = String(formPayload.formId ?? "");
      if (!formId) {
        throw new Error("create_form failed: missing formId");
      }

      if (canvas_state.form_fields.length > 0) {
        await callJson(
          `${FORMS_API_BASE}/forms/${formId}:batchUpdate`,
          {
            method: "POST",
            body: JSON.stringify({
              requests: canvas_state.form_fields.map((field, index) => ({
                createItem: {
                  item: {
                    title: field.label,
                    questionItem: buildFormQuestion(field).questionItem
                  },
                  location: {
                    index
                  }
                }
              }))
            })
          },
          "create_form_questions"
        );
      }

      const sheetPayload = await callJson(
        `${SHEETS_API_BASE}/spreadsheets`,
        {
          method: "POST",
          body: JSON.stringify({
            properties: {
              title: `${canvas_state.process_name} Responses`
            }
          })
        },
        "create_sheet"
      );
      const spreadsheetId = String(sheetPayload.spreadsheetId ?? "");
      if (!spreadsheetId) {
        throw new Error("create_sheet failed: missing spreadsheetId");
      }

      const lastColumn = toColumnLabel(canvas_state.sheet_headers.length);
      await callJson(
        `${SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/A1:${lastColumn}1?valueInputOption=RAW`,
        {
          method: "PUT",
          body: JSON.stringify({
            values: [canvas_state.sheet_headers]
          })
        },
        "set_sheet_headers"
      );

      const scriptProjectPayload = await callJson(
        `${APPS_SCRIPT_API_BASE}/projects`,
        {
          method: "POST",
          body: JSON.stringify({
            title: `${canvas_state.process_name} Automation`,
            parentId: spreadsheetId
          })
        },
        "create_script_project"
      );
      const scriptId = String(scriptProjectPayload.scriptId ?? "");
      if (!scriptId) {
        throw new Error("create_script_project failed: missing scriptId");
      }

      const scriptSource = buildAppsScriptSource({
        sheetId: spreadsheetId,
        headers: canvas_state.sheet_headers,
        formId
      });

      await callJson(
        `${APPS_SCRIPT_API_BASE}/projects/${scriptId}/content`,
        {
          method: "PUT",
          body: JSON.stringify({
            files: [
              {
                name: SCRIPT_FILENAME,
                type: "SERVER_JS",
                source: scriptSource
              },
              {
                name: "appsscript",
                type: "JSON",
                source: JSON.stringify({
                  timeZone: "Etc/UTC",
                  exceptionLogging: "STACKDRIVER",
                  runtimeVersion: "V8",
                  oauthScopes: [
                    "https://www.googleapis.com/auth/forms",
                    "https://www.googleapis.com/auth/spreadsheets",
                    "https://www.googleapis.com/auth/script.scriptapp"
                  ]
                })
              }
            ]
          })
        },
        "set_script_content"
      );

      await callJson(
        `${APPS_SCRIPT_API_BASE}/scripts/${scriptId}:run`,
        {
          method: "POST",
          body: JSON.stringify({
            function: "createSubmitTrigger",
            devMode: true
          })
        },
        "create_trigger"
      );

      return {
        form_id: formId,
        spreadsheet_id: spreadsheetId,
        script_id: scriptId
      };
    }
  };
}
