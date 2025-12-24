interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  connectionQuality: "excellent" | "good" | "fair" | "poor" | "unknown";
  onConnect: () => void;
  onDisconnect: () => void;
}

export function ConnectionStatus({
  isConnected,
  isConnecting,
  connectionQuality,
  onConnect,
  onDisconnect,
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    if (isConnecting) return "bg-yellow-500";
    if (!isConnected) return "bg-gray-500";
    switch (connectionQuality) {
      case "excellent":
        return "bg-green-500";
      case "good":
        return "bg-green-400";
      case "fair":
        return "bg-yellow-500";
      case "poor":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    if (isConnecting) return "Connecting...";
    if (!isConnected) return "Disconnected";
    return `Connected (${connectionQuality})`;
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`} />
        <span className="text-sm text-gray-200">{getStatusText()}</span>
      </div>
      <button
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isConnecting}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          isConnecting
            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
            : isConnected
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {isConnecting ? "Connecting..." : isConnected ? "Disconnect" : "Connect"}
      </button>
    </div>
  );
}
