"use client";

import { useState, useEffect } from "react";

interface Automation {
  id: string;
  name: string;
  active: boolean;
  triggers: string[];
  keywords: string[];
  match_type: string;
  specific_post_id: string | null;
  public_replies: string[];
  welcome_message: string;
  quick_reply_button: string;
  link_text: string;
  link_button_label: string;
  link_url: string;
  reminder_text: string;
  reminder_delay_minutes: number;
  created_at: string;
}

interface Media {
  id: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  caption?: string;
  permalink?: string;
}

export function AutomationsList({
  automations: initial,
  hasToken,
}: {
  automations: Automation[];
  hasToken: boolean;
}) {
  const [automations, setAutomations] = useState(initial);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [creating, setCreating] = useState(false);
  const [media, setMedia] = useState<Media[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  async function loadMedia() {
    setLoadingMedia(true);
    const res = await fetch("/api/admin/media");
    const data = await res.json();
    if (Array.isArray(data)) setMedia(data);
    setLoadingMedia(false);
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    if (hasToken) loadMedia();
  }

  function startEdit(a: Automation) {
    setEditing(a);
    setCreating(false);
    if (hasToken) loadMedia();
  }

  function cancelForm() {
    setEditing(null);
    setCreating(false);
  }

  async function refresh() {
    const res = await fetch("/api/admin/automations");
    const data = await res.json();
    if (Array.isArray(data)) setAutomations(data);
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta automacao?")) return;
    await fetch(`/api/admin/automations/${id}`, { method: "DELETE" });
    refresh();
  }

  async function handleToggle(automation: Automation) {
    await fetch(`/api/admin/automations/${automation.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !automation.active }),
    });
    refresh();
  }

  return (
    <div>
      {!hasToken && (
        <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Conecte o Instagram para liberar o seletor de posts.
        </div>
      )}

      {!creating && !editing && (
        <button
          onClick={startCreate}
          className="mb-6 inline-flex h-10 items-center justify-center rounded-lg bg-purple-600 px-6 text-white font-medium text-sm transition-opacity hover:opacity-90"
        >
          + Nova Automacao
        </button>
      )}

      {(creating || editing) && (
        <AutomationForm
          initial={editing}
          media={media}
          loadingMedia={loadingMedia}
          onCancel={cancelForm}
          onSaved={() => {
            cancelForm();
            refresh();
          }}
        />
      )}

      <div className="space-y-3">
        {automations.map((a) => (
          <div
            key={a.id}
            className="p-4 rounded-xl bg-white border border-zinc-200 flex items-start justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold truncate">{a.name}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    a.active
                      ? "bg-green-100 text-green-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {a.active ? "Ativa" : "Inativa"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                {a.triggers?.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded bg-zinc-100"
                  >
                    {t === "comment" ? "Comentario" : t === "message" ? "DM" : "Story"}
                  </span>
                ))}
                <span className="text-zinc-400">
                  Palavras: {(a.keywords ?? []).join(", ") || "nenhuma"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleToggle(a)}
                className="text-xs text-zinc-500 hover:text-zinc-700 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
              >
                {a.active ? "Pausar" : "Ativar"}
              </button>
              <button
                onClick={() => startEdit(a)}
                className="text-xs text-purple-600 hover:text-purple-700 px-2 py-1 rounded hover:bg-purple-50 transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(a.id)}
                className="text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
        {automations.length === 0 && !creating && (
          <p className="text-zinc-400 text-center py-12">
            Nenhuma automacao criada ainda.
          </p>
        )}
      </div>
    </div>
  );
}

function AutomationForm({
  initial,
  media,
  loadingMedia,
  onCancel,
  onSaved,
}: {
  initial: Automation | null;
  media: Media[];
  loadingMedia: boolean;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [triggers, setTriggers] = useState<string[]>(initial?.triggers ?? []);
  const [keywordsStr, setKeywordsStr] = useState(
    (initial?.keywords ?? []).join(", ")
  );
  const [matchType, setMatchType] = useState(initial?.match_type ?? "contains");
  const [specificPostId, setSpecificPostId] = useState(
    initial?.specific_post_id ?? ""
  );
  const [publicRepliesStr, setPublicRepliesStr] = useState(
    (initial?.public_replies ?? []).join(", ")
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    initial?.welcome_message ?? "Obrigado pelo seu comentario!"
  );
  const [quickReply, setQuickReply] = useState(
    initial?.quick_reply_button ?? "Quero saber mais"
  );
  const [linkText, setLinkText] = useState(
    initial?.link_text ?? "Aqui esta o link:"
  );
  const [linkButtonLabel, setLinkButtonLabel] = useState(
    initial?.link_button_label ?? "Acessar"
  );
  const [linkUrl, setLinkUrl] = useState(initial?.link_url ?? "");
  const [reminderText, setReminderText] = useState(
    initial?.reminder_text ?? ""
  );
  const [reminderDelay, setReminderDelay] = useState(
    initial?.reminder_delay_minutes ?? 0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body = {
      name,
      active,
      triggers,
      keywords: keywordsStr
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      match_type: matchType,
      specific_post_id: specificPostId || null,
      public_replies: publicRepliesStr
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
      welcome_message: welcomeMessage,
      quick_reply_button: quickReply,
      link_text: linkText,
      link_button_label: linkButtonLabel,
      link_url: linkUrl,
      reminder_text: reminderText,
      reminder_delay_minutes: reminderDelay,
    };

    const url = initial
      ? `/api/admin/automations/${initial.id}`
      : "/api/admin/automations";
    const method = initial ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      onSaved();
    } else {
      const err = await res.json();
      alert(err.error ?? "Erro ao salvar");
    }
    setSaving(false);
  }

  function toggleTrigger(t: string) {
    setTriggers((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 p-6 rounded-xl bg-white border border-zinc-200 space-y-4"
    >
      <h2 className="font-semibold text-lg">
        {initial ? "Editar Automacao" : "Nova Automacao"}
      </h2>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Nome da automacao
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Ex: Link do ebook"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-zinc-700">Ativa</label>
        <button
          type="button"
          onClick={() => setActive(!active)}
          className={`w-10 h-6 rounded-full transition-colors ${
            active ? "bg-purple-600" : "bg-zinc-300"
          } relative`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              active ? "left-[18px]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">
          Gatilhos
        </label>
        <div className="flex gap-4">
          {["comment", "story", "dm"].map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={triggers.includes(t)}
                onChange={() => toggleTrigger(t)}
                className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
              />
              {t === "comment"
                ? "Comentario"
                : t === "story"
                  ? "Story Reply"
                  : "DM"}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Palavras-chave (separadas por virgula)
        </label>
        <input
          type="text"
          value={keywordsStr}
          onChange={(e) => setKeywordsStr(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Ex: ebook, link, quero"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Tipo de match
        </label>
        <select
          value={matchType}
          onChange={(e) => setMatchType(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
        >
          <option value="contains">Contem a palavra</option>
          <option value="exact">Exato</option>
          <option value="any">Qualquer mensagem</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Post especifico (opcional)
        </label>
        {loadingMedia && (
          <p className="text-sm text-zinc-400 mb-2">Carregando posts...</p>
        )}
        {media.length > 0 && (
          <select
            value={specificPostId}
            onChange={(e) => setSpecificPostId(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white mb-2"
          >
            <option value="">Todos os posts</option>
            {media.map((m) => (
              <option key={m.id} value={m.id}>
                {m.caption?.slice(0, 60) ?? m.media_type} ({m.id.slice(0, 8)})
              </option>
            ))}
          </select>
        )}
        <input
          type="text"
          value={specificPostId}
          onChange={(e) => setSpecificPostId(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Ou cole o ID do post manualmente"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Respostas publicas (separadas por virgula, sorteia 1)
        </label>
        <input
          type="text"
          value={publicRepliesStr}
          onChange={(e) => setPublicRepliesStr(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Ex: Ola! Te mandei na DM, Obrigado! Olha seu direct"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Mensagem de boas-vindas (DM)
        </label>
        <textarea
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          required
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Botao de resposta rapida
          </label>
          <input
            type="text"
            value={quickReply}
            onChange={(e) => setQuickReply(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Label do botao do link
          </label>
          <input
            type="text"
            value={linkButtonLabel}
            onChange={(e) => setLinkButtonLabel(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          Texto do link
        </label>
        <input
          type="text"
          value={linkText}
          onChange={(e) => setLinkText(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">
          URL do link
        </label>
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="https://..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Texto do lembrete
          </label>
          <input
            type="text"
            value={reminderText}
            onChange={(e) => setReminderText(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Atraso do lembrete (minutos)
          </label>
          <input
            type="number"
            value={reminderDelay}
            onChange={(e) => setReminderDelay(Number(e.target.value))}
            min={0}
            className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 px-6 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-10 px-6 rounded-lg bg-purple-600 text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Salvando..." : initial ? "Salvar" : "Criar Automacao"}
        </button>
      </div>
    </form>
  );
}
