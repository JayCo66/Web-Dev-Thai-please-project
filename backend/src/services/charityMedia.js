const photos = {
  มูลนิธิยุวพัฒน์: [
    "yuvabadhana-cover.png",
    "https://www.yuvabadhanafoundation.org/th/what-we-do/scholarship/",
    "50% 0%",
  ],
  มูลนิธิสืบนาคะเสถียร: ["seub-cover.jpg", "https://www.seub.or.th/", "center"],
  มูลนิธิกระจกเงา: ["mirror-cover.jpg", "https://www.mirror.or.th/", "50% 22%"],
  มูลนิธิเด็ก: ["children-cover.jpg", "https://www.ffc.or.th/", "85% 45%"],
  มูลนิธิศุภนิมิตแห่งประเทศไทย: [
    "worldvision-cover.webp",
    "https://www.worldvision.or.th/",
    "center",
  ],
  "มูลนิธิเด็กโสสะแห่งประเทศไทย ในพระบรมราชินูปถัมภ์": [
    "sos-cover.jpg",
    "https://www.sosthailand.org/",
    "center",
  ],
};
const categories = {
  EDUCATION: "education",
  ENVIRONMENT: "environment",
  COMMUNITY: "community",
  HEALTHCARE: "healthcare",
};
function charityMedia(charity) {
  const photo = photos[charity.name];
  return {
    coverImageUrl: `/assets/charities/${photo ? photo[0] : (categories[charity.impact_type] || "community") + "-illustration.jpg"}`,
    imagePosition: photo?.[2] || "center",
    imageCaption: photo ? "ภาพจากเว็บไซต์มูลนิธิ" : "ภาพประกอบหมวดหมู่",
    websiteUrl: photo?.[1] || null,
  };
}
module.exports = { charityMedia };
