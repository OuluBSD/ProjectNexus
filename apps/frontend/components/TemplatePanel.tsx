"use client";

import { useState } from "react";
import { createTemplate } from "../lib/api";

type TemplateItem = {
  id: string;
  title: string;
  goal?: string;
  systemPrompt?: string;
  starterMessages?: Array<{ role: string; content: string }>;
  javascriptPrompt?: string;
  javascriptLogic?: string;
  jsonRequired?: boolean;
  metadata?: Record<string, unknown> | null;
};

type TemplatePanelProps = {
  templates: TemplateItem[];
  token: string;
  onTemplateCreated: () => void;
};

export function TemplatePanel({ templates, token, onTemplateCreated }: TemplatePanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formState, setFormState] = useState({
    title: "",
    goal: "",
    systemPrompt: "",
    javascriptPrompt: "",
    javascriptLogic: "",
    jsonRequired: false,
    metadata: "{}",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title.trim()) {
      setError("Title is required");
      return;
    }

    // Validate metadata JSON
    let metadataObj: Record<string, unknown> | undefined;
    if (formState.metadata.trim()) {
      try {
        metadataObj = JSON.parse(formState.metadata);
      } catch {
        setError("Invalid JSON in metadata field");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createTemplate(token, {
        title: formState.title.trim(),
        goal: formState.goal.trim() || undefined,
        systemPrompt: formState.systemPrompt.trim() || undefined,
        javascriptPrompt: formState.javascriptPrompt.trim() || undefined,
        javascriptLogic: formState.javascriptLogic.trim() || undefined,
        jsonRequired: formState.jsonRequired,
        metadata: metadataObj,
      });

      setFormState({
        title: "",
        goal: "",
        systemPrompt: "",
        javascriptPrompt: "",
        javascriptLogic: "",
        jsonRequired: false,
        metadata: "{}",
      });
      setShowCreateForm(false);
      setShowAdvanced(false);
      onTemplateCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormState({
      title: "",
      goal: "",
      systemPrompt: "",
      javascriptPrompt: "",
      javascriptLogic: "",
      jsonRequired: false,
      metadata: "{}",
    });
    setError(null);
    setShowCreateForm(false);
    setShowAdvanced(false);
  };

  return (
    <>
      <div className="context-panel-section">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <span className="context-panel-label">Templates</span>
          {!showCreateForm && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="small-action-button"
              style={{
                fontSize: "0.75rem",
                padding: "0.25rem 0.5rem",
                background: "#3B82F6",
                color: "#FFF",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              + New
            </button>
          )}
        </div>

        {showCreateForm ? (
          <form onSubmit={handleSubmit} className="template-create-form">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <input
                  type="text"
                  placeholder="Template title"
                  value={formState.title}
                  onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    fontSize: "0.875rem",
                    border: "1px solid #374151",
                    borderRadius: "4px",
                    background: "#1F2937",
                    color: "#F9FAFB",
                  }}
                  autoFocus
                />
              </div>
              <div>
                <textarea
                  placeholder="Goal (optional)"
                  value={formState.goal}
                  onChange={(e) => setFormState((s) => ({ ...s, goal: e.target.value }))}
                  disabled={isSubmitting}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    fontSize: "0.875rem",
                    border: "1px solid #374151",
                    borderRadius: "4px",
                    background: "#1F2937",
                    color: "#F9FAFB",
                    resize: "vertical",
                  }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="json-required-checkbox"
                  checked={formState.jsonRequired}
                  onChange={(e) => setFormState((s) => ({ ...s, jsonRequired: e.target.checked }))}
                  disabled={isSubmitting}
                  style={{ cursor: "pointer" }}
                />
                <label
                  htmlFor="json-required-checkbox"
                  style={{ fontSize: "0.875rem", cursor: "pointer" }}
                >
                  Require JSON status output
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  fontSize: "0.75rem",
                  padding: "0.25rem 0.5rem",
                  background: "#374151",
                  color: "#D1D5DB",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  alignSelf: "flex-start",
                }}
              >
                {showAdvanced ? "▼ Hide Advanced" : "▶ Show Advanced"}
              </button>

              {showAdvanced && (
                <>
                  <div>
                    <label
                      style={{
                        fontSize: "0.75rem",
                        color: "#9CA3AF",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      System Prompt (optional)
                    </label>
                    <textarea
                      placeholder="System prompt for the AI..."
                      value={formState.systemPrompt}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, systemPrompt: e.target.value }))
                      }
                      disabled={isSubmitting}
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        fontSize: "0.75rem",
                        border: "1px solid #374151",
                        borderRadius: "4px",
                        background: "#0D1117",
                        color: "#F9FAFB",
                        fontFamily: "monospace",
                        resize: "vertical",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.75rem",
                        color: "#9CA3AF",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      JavaScript Prompt (optional)
                    </label>
                    <textarea
                      placeholder="JS code to generate dynamic prompts..."
                      value={formState.javascriptPrompt}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, javascriptPrompt: e.target.value }))
                      }
                      disabled={isSubmitting}
                      rows={4}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        fontSize: "0.75rem",
                        border: "1px solid #374151",
                        borderRadius: "4px",
                        background: "#0D1117",
                        color: "#F9FAFB",
                        fontFamily: "monospace",
                        resize: "vertical",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.75rem",
                        color: "#9CA3AF",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      JavaScript Logic (optional)
                    </label>
                    <textarea
                      placeholder="JS code to interpret JSON status..."
                      value={formState.javascriptLogic}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, javascriptLogic: e.target.value }))
                      }
                      disabled={isSubmitting}
                      rows={4}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        fontSize: "0.75rem",
                        border: "1px solid #374151",
                        borderRadius: "4px",
                        background: "#0D1117",
                        color: "#F9FAFB",
                        fontFamily: "monospace",
                        resize: "vertical",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.75rem",
                        color: "#9CA3AF",
                        display: "block",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Metadata (JSON, optional)
                    </label>
                    <textarea
                      placeholder='{"key": "value"}'
                      value={formState.metadata}
                      onChange={(e) => setFormState((s) => ({ ...s, metadata: e.target.value }))}
                      disabled={isSubmitting}
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        fontSize: "0.75rem",
                        border: "1px solid #374151",
                        borderRadius: "4px",
                        background: "#0D1117",
                        color: "#F9FAFB",
                        fontFamily: "monospace",
                        resize: "vertical",
                      }}
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="item-subtle" style={{ color: "#EF4444" }}>
                  {error}
                </div>
              )}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    fontSize: "0.875rem",
                    background: "#10B981",
                    color: "#FFF",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                >
                  {isSubmitting ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    fontSize: "0.875rem",
                    background: "#6B7280",
                    color: "#FFF",
                    border: "none",
                    borderRadius: "4px",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        ) : (
          <>
            {templates.length > 0 ? (
              <div className="context-panel-roadmaps">
                {templates.map((template) => (
                  <div className="context-panel-list-item" key={template.id}>
                    <span>{template.title}</span>
                    <span className="item-subtle">{template.goal ?? "No goal defined."}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="item-subtle">No templates yet. Create your first template above.</div>
            )}
          </>
        )}
      </div>
    </>
  );
}
