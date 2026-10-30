import { useState } from "react";
// Store your logo in frontend/public/assets/brand/ and change this URL if needed.
const LOGO_SRC = "/assets/brand/logo.png";
export default function ProjectBrand() {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return <img className="xp-brand-image" src={LOGO_SRC} alt="ไทยช่วยไทยพลีส" width="180" height="64" onError={() => setFailed(true)} />;
  }
  return <><span className="xp-brand-mark" aria-hidden="true">tp<span/></span><span className="xp-brand-thai"><strong>ไทยช่วยไทย<span>พลีส</span></strong><small>THAI PLEASE</small></span></>;
}
