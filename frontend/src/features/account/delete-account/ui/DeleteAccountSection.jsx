import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { deleteAccountRequest } from "@features/account/delete-account/api/deleteAccount.api.js";
import { useSessionStore } from "@entities/session/model/useSessionStore.js";
import { useRequest } from "@shared/lib/useRequest.js";
import { ROUTES } from "@shared/constants/routes.js";
import { ConfirmModal } from "@shared/ui/ConfirmModal.jsx";
import { ErrorAlert } from "@shared/ui/ErrorAlert.jsx";
import { TextField } from "@shared/ui/TextField.jsx";

/**
 * Блок «Удалить аккаунт»: кнопка → модальное окно с вопросом (Да / Нет).
 * Личность подтверждается текущим паролем (проверяется на сервере, как и при
 * смене пароля/email), чтобы украденная сессия не позволяла удалить аккаунт.
 */
export function DeleteAccountSection() {
  const navigate = useNavigate();
  const clear = useSessionStore((s) => s.clear);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const { loading, error, run, clearError } = useRequest();

  const close = useCallback(() => {
    setOpen(false);
    setPassword("");
    clearError();
  }, [clearError]);

  const confirm = async () => {
    const result = await run(() => deleteAccountRequest({ currentPassword: password }));
    if (!result) return;
    // Сервер уже удалил аккаунт и завершил все сессии.
    clear();
    navigate(ROUTES.login, { replace: true, state: { notice: "Аккаунт удалён." } });
  };

  return (
    <section className="col-12" aria-labelledby="delete-account-title">
      <div className="card border-danger">
        <div className="card-body">
          <h2 id="delete-account-title" className="h5 card-title text-danger">
            Удалить аккаунт
          </h2>
          <p className="text-body-secondary">
            Аккаунт и все связанные с ним данные будут удалены без возможности восстановления.
            Все активные сессии будут завершены.
          </p>
          <button
            type="button"
            className="btn btn-danger d-inline-flex align-items-center gap-2"
            onClick={() => setOpen(true)}
          >
            <Trash2 size={18} aria-hidden="true" />
            Удалить аккаунт
          </button>
        </div>
      </div>

      <ConfirmModal
        open={open}
        title="Удалить аккаунт?"
        confirmText="Да"
        cancelText="Нет"
        loading={loading}
        onConfirm={confirm}
        onCancel={close}
      >
        <ErrorAlert error={error} />
        <p>Вы действительно хотите удалить аккаунт? Это действие нельзя отменить.</p>
        <TextField
          id="delete-password"
          label="Текущий пароль"
          hint="Нужен для подтверждения личности."
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />
      </ConfirmModal>
    </section>
  );
}
