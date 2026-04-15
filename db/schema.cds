namespace inventory;

using { cuid } from '@sap/cds/common';

entity products : cuid {
  name:String(260);
  description:String(100);
  price:Decimal(10,2);
  stock:Integer;
  minimum_level  : Integer;
  supplier:Association to supplier; 
  productDetails:Association to many orders
                 on productDetails.product = $self;
}

entity supplier : cuid {
  name:String;
  email:String;
}

entity orders : cuid {
  product :Association to products;
  quantity:Integer;
  status:String;
  createAt:Timestamp @cds.on.insert: $now;
}
