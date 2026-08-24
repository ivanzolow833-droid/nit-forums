import Link from "next/link";

export default function NotFound() {
  return <main className="seo-initial-shell">
    <section className="dark-panel seo-initial-card text-center">
      <span>Ошибка 404</span>
      <h1>Страница не найдена</h1>
      <p>Возможно, тема или раздел были удалены, перемещены либо недоступны для публичного просмотра.</p>
      <Link href="/" className="mt-6 inline-flex rounded-md bg-purple-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-purple-500">Вернуться на форум</Link>
    </section>
  </main>;
}
