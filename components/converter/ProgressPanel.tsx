'use client';

import { useTranslations } from 'next-intl';
import type { ConversionProgress } from '@/lib/engine';

/**
 * ProgressPanel — 转换进度条
 *
 * 显示：
 * - 当前阶段（parsing / extracting-text / assembling）
 * - 逐页进度（X / N pages）
 * - 进度条
 */

interface ProgressPanelProps {
  progress: ConversionProgress;
  filename: string;
}

// 阶段标签由 i18n 字典提供（messages/{en,es,pt}.json 的 converter 命名空间）
//
// 'ocr' key 的翻译字符串会在 §5.2 step 5（UI 改造）一起补到三语字典；
// 当前仅占位（运行时未触发该阶段，不会显示）。
const STAGE_KEYS: Record<ConversionProgress['stage'], string | null> = {
  idle: null,
  parsing: 'stageParsing',
  'extracting-text': 'stageExtracting',
  ocr: 'stageOcr',
  assembling: 'stageAssembling',
  done: 'stageDone',
  error: 'stageError',
  cancelled: 'stageCancelled',
};

export function ProgressPanel({ progress, filename }: ProgressPanelProps) {
  const t = useTranslations('converter');

  const totalPages = progress.totalPages || 1;
  const percent =
    progress.stage === 'done'
      ? 100
      : Math.min(100, Math.round((progress.currentPage / totalPages) * 100));

  const stageKey = STAGE_KEYS[progress.stage];
  const stageLabel = stageKey ? t(stageKey) : '';

  return (
    <div className="flex items-center gap-3 flex-wrap px-5 py-3.5 border-t border-[var(--color-rule)] bg-[color-mix(in_srgb,var(--color-paper)_60%,transparent)]">
      <span className="font-mono text-[11.5px] tracking-[0.04em] text-[var(--color-ink-soft)] max-w-[180px] truncate" title={filename}>
        [{filename}]
      </span>
      <span
        className="font-mono text-[11.5px] tracking-[0.04em] text-[var(--color-ink-soft)]"
        aria-live="polite"
      >
        {stageLabel} {progress.totalPages > 0 && `(${progress.currentPage}/${progress.totalPages})`}
      </span>
      <div
        className="flex-1 min-w-[160px] h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--color-rule)' }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${percent}%`,
            background: 'var(--color-accent)',
          }}
        />
      </div>
    </div>
  );
}