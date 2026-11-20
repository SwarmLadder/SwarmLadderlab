import { redirect } from "next/navigation";
// The old flat curriculum now lives on the course route.
export default function Page() {
  redirect("/learn/python");
}
