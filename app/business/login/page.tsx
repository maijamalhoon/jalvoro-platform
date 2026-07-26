import { redirect } from "next/navigation";

export default function BusinessLoginPage() {
  redirect("/login?realm=business&next=%2Fbusiness");
}
