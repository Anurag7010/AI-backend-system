import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "Create account",
  description:
    "Create a free PrometheonAI account — upload documents and get cited answers grounded in your sources.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
