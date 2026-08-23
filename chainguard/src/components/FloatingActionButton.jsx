import { Link } from 'react-router-dom';
import { FiUploadCloud } from 'react-icons/fi';

export default function FloatingActionButton() {
  return (
    <Link
      to="/upload"
      aria-label="Upload evidence"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue to-cyan text-navy shadow-lg shadow-cyan/20 transition-transform hover:scale-110 lg:bottom-8 lg:right-8"
    >
      <FiUploadCloud size={22} />
    </Link>
  );
}
