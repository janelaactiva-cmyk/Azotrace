'use client';

import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { closeMessage, getMessage, getServerMessage, subscribeMessages } from '~/lib/app-messages';
import styles from './MessageDialogHost.module.css';

export default function MessageDialogHost() {
  const message = useSyncExternalStore(subscribeMessages, getMessage, getServerMessage);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!message || !dialog) return;
    const previousFocus = document.activeElement;
    if (!dialog.open) dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [message]);
  if (!message) return null;
  return (
    <dialog ref={dialogRef} className={styles.dialog} role="alertdialog"
      aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); closeMessage(message.id, false); }}>
      <h2 id={titleId} className={styles.title}>{message.kind === 'confirm' ? 'Confirmar ação' : 'Aviso'}</h2>
      <p id={descriptionId} className={styles.message}>{message.text}</p>
      <div className={styles.actions}>
        {message.kind === 'confirm' && <button type="button" autoFocus className={styles.button}
          onClick={() => closeMessage(message.id, false)}>Cancelar</button>}
        <button type="button" autoFocus={message.kind === 'notice'} className={styles.button}
          onClick={() => closeMessage(message.id, true)}>{message.kind === 'confirm' ? 'Confirmar' : 'OK'}</button>
      </div>
    </dialog>
  );
}
