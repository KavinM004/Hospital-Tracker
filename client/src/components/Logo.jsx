export default function Logo({ className = "" }) {
  return (
    <div className={`logo ${className}`} aria-label="MediCare Hospital">
      <div className="logo-main">
        <span>MEDI</span>
        <span>CARE</span>
      </div>

      <div className="logo-sub">H O S P I T A L</div>
    </div>
  );
}
