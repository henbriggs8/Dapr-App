interface WalletLogoProps {
  wallet: "apple" | "google";
  className?: string;
}

export function WalletLogo({ wallet, className }: WalletLogoProps) {
  if (wallet === "apple") {
    return (
      <svg
        viewBox="0 0 50 20"
        width="38"
        height="15"
        aria-hidden="true"
        fill="currentColor"
        className={className ?? "text-gray-500 shrink-0"}
      >
        <path d="M9.3 2.6c-.5.6-1.3 1.1-2.1 1-.1-.8.3-1.7.8-2.2C8.5.8 9.4.3 10.2.4c.1.9-.3 1.7-.9 2.2zm.9 1.4c-1.2-.1-2.2.7-2.8.7-.6 0-1.5-.6-2.5-.6C3.6 4.2 2.2 5 1.4 6.3.0 8.7.9 12.3 2.3 14.3c.7 1 1.5 2 2.6 2 1 0 1.4-.7 2.7-.7 1.3 0 1.6.7 2.7.7 1.1 0 1.8-.9 2.5-1.9.8-1.1 1.1-2.2 1.1-2.3-.1 0-2.1-.8-2.1-3.1 0-1.9 1.6-2.8 1.7-2.9-.9-1.4-2.4-1.6-2.9-1.6l-.4.5z" />
        <text x="16" y="14" fontSize="10" fontWeight="600" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif" fill="currentColor">Pay</text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 60 24"
      width="42"
      height="17"
      aria-hidden="true"
      fill="none"
      className={className}
    >
      <text x="0" y="17" fontSize="11" fontWeight="600" fontFamily="sans-serif" fill="#4285F4">G</text>
      <text x="9" y="17" fontSize="11" fontWeight="600" fontFamily="sans-serif" fill="#EA4335">o</text>
      <text x="17" y="17" fontSize="11" fontWeight="600" fontFamily="sans-serif" fill="#FBBC05">o</text>
      <text x="25" y="17" fontSize="11" fontWeight="600" fontFamily="sans-serif" fill="#4285F4">g</text>
      <text x="33" y="17" fontSize="11" fontWeight="600" fontFamily="sans-serif" fill="#34A853">l</text>
      <text x="38" y="17" fontSize="11" fontWeight="600" fontFamily="sans-serif" fill="#EA4335">e</text>
      <text x="46" y="17" fontSize="11" fontWeight="500" fontFamily="sans-serif" fill="#5F6368"> Pay</text>
    </svg>
  );
}
