using { inventory as db } from '../db/schema';

service inventoryHandler {

    entity products as projection on db.products;
    entity supplier as projection on db.supplier;
    entity orders as projection on db.orders;

    action askAI(query: String) returns array of products;

}
