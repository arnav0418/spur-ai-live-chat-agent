import { ChatWidget } from "@/components/ChatWidget";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full opacity-40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Nova Threads</h1>
          <p className="text-gray-500 text-sm mt-1">Modern fashion, delivered to your door</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100" style={{ height: "600px" }}>
          <ChatWidget />
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Powered by AI · Nova Threads © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
