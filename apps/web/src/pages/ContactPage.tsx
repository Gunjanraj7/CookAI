import { zodResolver } from "@hookform/resolvers/zod";
import { contactInputSchema, type ContactInput } from "@cookai/shared";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { useSendContact } from "@/lib/queries";
import { errorMessage } from "@/lib/utils";

export function ContactPage() {
  const send = useSendContact();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactInputSchema),
    defaultValues: { name: "", email: "", message: "" },
    mode: "onTouched",
  });

  async function onSubmit(values: ContactInput) {
    try {
      await send.mutateAsync(values);
      toast.success("Message sent. Thanks!");
      reset();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-5xl font-display">Contact</h1>
      <p className="mt-3 text-lg text-ink-soft">Found a bug, or have an idea for a recipe feature? Leave a message.</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
        <Field label="Your name" error={errors.name?.message}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} autoComplete="name" aria-describedby={describedBy} aria-invalid={invalid} {...register("name")} />
          )}
        </Field>
        <Field label="Email" error={errors.email?.message}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} type="email" autoComplete="email" aria-describedby={describedBy} aria-invalid={invalid} {...register("email")} />
          )}
        </Field>
        <Field label="Message" error={errors.message?.message}>
          {({ id, describedBy, invalid }) => (
            <Textarea id={id} rows={6} aria-describedby={describedBy} aria-invalid={invalid} {...register("message")} />
          )}
        </Field>
        <Button type="submit" variant="primary" size="lg" loading={isSubmitting}>
          Send message
        </Button>
      </form>
    </div>
  );
}
