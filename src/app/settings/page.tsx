"use client";
import { MainLayout } from "@/components/main-layout";
import { SettingsForm } from "@/components/settings/settings-form";

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p>Configure KontainMonitor preferences.</p>
        <SettingsForm />
      </div>
    </MainLayout>
  );
}
