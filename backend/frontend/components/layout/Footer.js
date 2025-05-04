export default function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-900 py-8 mt-16 border-t border-gray-200 dark:border-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h2 className="text-xl font-bold text-primary">NumisRoma</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Catalogo e collezione di monete antiche romane</p>
          </div>
          
          <div className="flex flex-col space-y-2">
            <p className="text-gray-600 dark:text-gray-400 text-sm">© {new Date().getFullYear()} NumisRoma. Tutti i diritti riservati.</p>
            <p className="text-gray-500 dark:text-gray-500 text-xs">Le immagini delle monete sono soggette alle rispettive licenze.</p>
          </div>
        </div>
      </div>
    </footer>
  );
} 