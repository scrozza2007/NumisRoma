import Link from 'next/link';
import MainLayout from '../components/layout/MainLayout';

export default function NotFound() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16 flex flex-col items-center">
        <div className="text-primary text-9xl font-bold">404</div>
        <h1 className="mt-4 text-3xl font-bold">Pagina non trovata</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 text-center max-w-md">
          La pagina che stai cercando non esiste o è stata spostata.
        </p>
        <Link href="/" className="mt-8 btn-primary">
          Torna alla home
        </Link>
      </div>
    </MainLayout>
  );
} 