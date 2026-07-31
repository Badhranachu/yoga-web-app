export const FormError = ({ message }: { message: string | null }) => {
  if (!message) return null;

  return (
    <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
      {message}
    </div>
  );
};

export const FormSuccess = ({ message }: { message: string | null }) => {
  if (!message) return null;

  return (
    <div className="mb-6 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
      {message}
    </div>
  );
};
