import { useState } from "react";
import { requestEmailChange } from "@features/account/change-email/api/changeEmail.api.js";
import { useRequest } from "@shared/lib/useRequest.js";
import { ReadonlyField } from "@shared/ui/ReadonlyField.jsx";
import { TextField } from "@shared/ui/TextField.jsx";
import { ErrorAlert } from "@shared/ui/ErrorAlert.jsx";
import { SubmitButton } from "@shared/ui/SubmitButton.jsx";

/** Шаг 1: код уходит на НОВЫЙ адрес. onRequested({ maskedEmail, resendAfterSeconds }) */
export function ChangeEmailForm({ maskedEmail, onRequested }) {
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const { loading, error, run } = useRequest();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await run(() => requestEmailChange({ newEmail, currentPassword }));
    if (result) onRequested(result);
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={loading}>
      <ErrorAlert error={error} />

      <ReadonlyField id="em-current-email" label="Текущий email" value={maskedEmail} />

      <TextField
        id="em-new"
        label="Новый email"
        hint="Код подтверждения будет отправлен на новый адрес."
        type="email"
        autoComplete="email"
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        required
      />
      <TextField
        id="em-password"
        label="Текущий пароль"
        hint="Нужен для подтверждения личности."
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
      />

      <SubmitButton loading={loading} loadingText="Отправляем код…">
        Изменить email
      </SubmitButton>
    </form>
  );
}
