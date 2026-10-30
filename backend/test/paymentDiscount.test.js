const {test}=require("node:test");
const assert=require("node:assert/strict");
const {discountTerms,calculateDiscount}=require("../src/services/paymentDiscount");
test("only configured discount offers can reduce a payment",()=>{
 assert.equal(discountTerms({kind:"LUCKY_DRAW",metadata:{title:"คูปองส่วนลด 50 บาท"}}),null);
 assert.equal(discountTerms({kind:"COUPON",metadata:{title:"คูปองเครื่องดื่มฟรี 1 แก้ว"}}),null);
 assert.deepEqual(discountTerms({reward_type:"COUPON",name:"คูปองส่วนลด 50 บาท"}),{type:"FIXED",amount:50,minimumAmount:50});
});
test("legacy discount vouchers and immutable issued terms are recognized",()=>{
 const terms={type:"FIXED",amount:25,minimumAmount:50};
 assert.deepEqual(discountTerms({kind:"DISCOUNT",metadata:{paymentDiscount:terms,title:"Renamed"}}),terms);
 assert.equal(discountTerms({kind:"COUPON",metadata:{paymentDiscount:{type:"FIXED",amount:-50,minimumAmount:50},title:"Unknown"}}),null);
});
test("discount validates minimum and never exceeds the order",()=>{
 const terms=discountTerms({kind:"COUPON",metadata:{title:"คูปองส่วนลด 50 บาท"}});
 assert.throws(()=>calculateDiscount(49.99,terms),e=>e.statusCode===400);
 assert.equal(calculateDiscount(50,terms),50);
 assert.equal(calculateDiscount(100,terms),50);
 assert.equal(calculateDiscount(100,null),0);
});
