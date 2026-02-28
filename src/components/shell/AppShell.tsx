"use client";

import * as Tabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type MobileTab = "discuss" | "design" | "deploy";

export interface AppShellProps {
  topBar: ReactNode;
  leftRail: ReactNode;
  rightStage: ReactNode;
  mobilePanels: Record<MobileTab, ReactNode>;
  defaultMobileTab?: MobileTab;
}

const mobileTabs: Array<{ value: MobileTab; label: string }> = [
  { value: "discuss", label: "Discuss" },
  { value: "design", label: "Design" },
  { value: "deploy", label: "Deploy" }
];

export function AppShell({
  topBar,
  leftRail,
  rightStage,
  mobilePanels,
  defaultMobileTab = "discuss"
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur" aria-label="Workspace top bar">
        <div className="mx-auto flex w-full max-w-workspace items-center justify-between gap-4 px-4 py-3">
          {topBar}
        </div>
      </header>

      <main className="mx-auto w-full max-w-workspace px-4 py-4">
        <div className="hidden grid-cols-12 gap-4 lg:grid" data-testid="desktop-shell">
          <aside className="col-span-4" aria-label="Interaction rail">
            {leftRail}
          </aside>
          <section className="col-span-8" aria-label="Design stage">
            {rightStage}
          </section>
        </div>

        <Tabs.Root defaultValue={defaultMobileTab} className="space-y-4 lg:hidden" aria-label="Mobile workspace tabs">
          <Tabs.List
            aria-label="Workspace view switch"
            className="grid grid-cols-3 rounded-control border border-line bg-surface p-1"
          >
            {mobileTabs.map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "min-h-11 rounded-control px-2 py-2 text-sm font-semibold text-muted transition-colors duration-hover ease-editorial",
                  "hover:text-ink data-[state=active]:bg-surface-2 data-[state=active]:text-ink",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                )}
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {mobileTabs.map((tab) => (
            <Tabs.Content key={tab.value} value={tab.value} className="outline-none">
              {mobilePanels[tab.value]}
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </main>
    </div>
  );
}
