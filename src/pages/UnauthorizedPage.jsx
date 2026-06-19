import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <section className="state-page">
      <ShieldAlert size={42} />
      <h1>Access restricted</h1>
      <p>Your current role does not include this permission.</p>
    </section>
  );
}
