interface LoadingOverlayProps {
  message: string
}

export default function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner">
          <div className="spinner-ring" />
          <div className="spinner-ring spinner-ring-2" />
        </div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  )
}
