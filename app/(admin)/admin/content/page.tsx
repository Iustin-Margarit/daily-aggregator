import { redirect } from 'next/navigation';

// Old URL of the source manager.
export default function ContentRedirect() {
  redirect('/admin/sources');
}
