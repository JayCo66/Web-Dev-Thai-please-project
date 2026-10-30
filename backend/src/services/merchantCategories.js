// Shop categories a merchant can register under. Names matter: questMetrics reads them to tell food shops from the rest.
const MERCHANT_CATEGORIES = [
  { category_id: 1, category_name: 'อาหารและเครื่องดื่ม' },
  { category_id: 2, category_name: 'สินค้าทั่วไปและของใช้' },
  { category_id: 3, category_name: 'สินค้า OTOP และวิสาหกิจชุมชน' },
  { category_id: 4, category_name: 'บริการชุมชนและสุขภาพ' },
];

module.exports = { MERCHANT_CATEGORIES };
