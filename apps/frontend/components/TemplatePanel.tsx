"use client";

import { useState } from "react";
import { createTemplate } from "../lib/api";

type TemplateItem = {
  id: string;
  title: string;
  goal?: string;
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
  const [formState, setFormState] = useState({
    title: "",
    goal: "",
    jsonRequired: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title.trim()) {
      setError("Title is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createTemplate(token, {
        title: formState.title.trim(),
        goal: formState.goal.trim() || undefined,
        jsonRequired: formState.jsonRequired,
      });

      setFormState({ title: "", goal: "", jsonRequired: false });
      setShowCreateForm(false);
      onTemplateCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormState({ title: "", goal: "", jsonRequired: false });
    setError(null);
    setShowCreateForm(false);
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
