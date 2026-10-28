// Aviso rojo cuando falla la comunicación con el backend
function ErrorCarga({ mensaje }) {
  if (!mensaje) return null;
  return (
    <div className="w-full bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-lg">
      {mensaje}
    </div>
  );
}

export default ErrorCarga;
