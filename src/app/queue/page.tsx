import { redirect } from "next/navigation";

export default function QueuePage() {
  // Same-day walk-ins are registered by reception; customers use appointment booking.
  redirect("/book");
}
