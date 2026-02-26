'use client';

import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

type Props = {
  targetUserId: string;
  shouldWarn: boolean;
  probability: number;
  warningMessage: string;
  className?: string;
  disabled?: boolean;
  disabledReason?: string;
  onBeforeSubmit?: () => boolean;
  children?: ReactNode;
};

export function StrongLikeAction({
  targetUserId,
  shouldWarn,
  probability,
  warningMessage,
  className,
  disabled,
  disabledReason,
  onBeforeSubmit,
  children
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showWarning, setShowWarning] = useState(false);

  const submitStrongLike = () => {
    if (disabled) return;
    if (onBeforeSubmit && !onBeforeSubmit()) return;
    formRef.current?.requestSubmit();
  };

  const onStrongLikeClick = () => {
    if (disabled) return;
    if (!shouldWarn) return submitStrongLike();
    setShowWarning(true);
  };

  const onContinue = () => {
    setShowWarning(false);
    submitStrongLike();
  };

  return (
    <>
      <form ref={formRef} action="/api/like" method="post">
        <input type="hidden" name="toUserId" value={targetUserId} />
        <input type="hidden" name="type" value="strong" />
        <button
          type="button"
          className={className ?? 'underline'}
          onClick={onStrongLikeClick}
          disabled={disabled}
          title={disabled ? (disabledReason ?? 'Unavailable') : undefined}
        >
          {children ?? 'Strong Like'}
        </button>
      </form>
      {showWarning ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card max-w-md space-y-3 p-4 text-sm">
            <p className="font-semibold">Market Warning</p>
            <p>Estimated Match Probability: {probability}%</p>
            <p>{warningMessage}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="card w-full" onClick={onContinue}>Continue Strong Like</button>
              <button type="button" className="card w-full" onClick={() => setShowWarning(false)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
