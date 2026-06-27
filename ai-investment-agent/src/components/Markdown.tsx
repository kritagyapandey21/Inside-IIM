/**
 * Minimal markdown renderer for the agent's prose output. Supports the subset
 * the LLM actually emits: ## / ### headings, "- " bullets, **bold** lines.
 * Replaces three near-identical inline parsers in ResultsDisplay.
 */
export default function Markdown({ text }: { text: string }) {
  return (
    <div className="prose-content">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## ") || line.startsWith("# ")) {
          return (
            <h3 key={i} className="analysis-h2">
              {line.replace(/^#+\s/, "")}
            </h3>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h4 key={i} className="analysis-h3">
              {line.replace("### ", "")}
            </h4>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <div key={i} className="analysis-bullet">
              <span className="bullet-dot" />
              <span>{line.replace("- ", "")}</span>
            </div>
          );
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={i} className="analysis-bold">
              {line.replace(/\*\*/g, "")}
            </p>
          );
        }
        if (line.trim()) {
          return (
            <p key={i} className="analysis-text">
              {line}
            </p>
          );
        }
        return <div key={i} className="analysis-spacer" />;
      })}
    </div>
  );
}
