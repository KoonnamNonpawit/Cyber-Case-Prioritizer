import { redirect } from "next/navigation";


export default function Home() {
  const session = null;
  if (!session) {
    redirect("/auth");
  }
  redirect("/dashboard");
}