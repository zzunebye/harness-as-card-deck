import { LAYER_INFO, type Deck } from "../types.ts";
import { useT } from "../i18n/index.ts";
import type { FlowState } from "../lib/urlState.ts";

interface Props {
  deck: Deck;
  replay: FlowState | null;
  onStart(id: string): void;
  onStep(step: number): void;
  onClose(): void;
  onDetails?: () => void;
}

export function FlowBar({ deck, replay, onStart, onStep, onClose, onDetails }: Props) {
  const t = useT();
  const flows = deck.flows ?? [];
  const flow = flows.find((f) => f.id === replay?.id);
  if (!flow || !replay) {
    return (
      <div className="flow-bar" role="group" aria-label={t.flow.heading}>
        <span className="flow-heading">{t.flow.heading}</span>
        {flows.map((f) => (
          <button key={f.id} type="button" className="flow-chip" title={f.prompt} onClick={() => onStart(f.id)}>
            {f.id.replace(/-/g, " ")}
          </button>
        ))}
      </div>
    );
  }
  const total = flow.steps.length;
  const step = flow.steps[replay.step];
  const layer = deck.cards.find((c) => c.id === step.card)?.layer;
  return (
    <div className="flow-bar active" role="group" aria-label={t.flow.heading}>
      <p className="flow-prompt">{flow.prompt}</p>
      <div className="flow-controls">
        <button type="button" aria-label={t.flow.prev} disabled={replay.step === 0} onClick={() => onStep(replay.step - 1)}>
          ‹
        </button>
        <span className="flow-count" aria-live="polite">
          {t.flow.step(replay.step + 1, total)}
        </span>
        <button type="button" aria-label={t.flow.next} disabled={replay.step === total - 1} onClick={() => onStep(replay.step + 1)}>
          ›
        </button>
        <button type="button" className="flow-close" aria-label={t.flow.close} onClick={onClose}>
          ✕
        </button>
      </div>
      {onDetails && (
        <p className="flow-reason">
          {layer && <b>{LAYER_INFO[layer].suit} </b>}
          {step.reason}{" "}
          <button type="button" className="flow-details" onClick={onDetails}>
            {t.flow.details}
          </button>
        </p>
      )}
      <p className="flow-note">{t.flow.disclaimer}</p>
    </div>
  );
}
