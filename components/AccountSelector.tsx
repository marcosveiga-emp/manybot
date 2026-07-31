"use client";

import { useRouter } from "next/navigation";

export function AccountSelector({
  accounts,
  selectedId,
}: {
  accounts: { instagram_user_id: string; instagram_username: string }[];
  selectedId: string | null;
}) {
  const router = useRouter();

  if (accounts.length === 0) return null;

  return (
    <div className="mb-6">
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
        Conta Ativa
      </label>
      <select
        value={selectedId || ""}
        onChange={(e) => {
          document.cookie = `selected_ig_account=${e.target.value}; path=/`;
          router.refresh();
        }}
        className="w-full border border-zinc-300 rounded-lg p-2 text-sm bg-zinc-50 outline-none focus:border-zinc-500"
      >
        <option value="" disabled>
          Selecione uma conta...
        </option>
        {accounts.map((acc) => (
          <option key={acc.instagram_user_id} value={acc.instagram_user_id}>
            @{acc.instagram_username}
          </option>
        ))}
      </select>
    </div>
  );
}
