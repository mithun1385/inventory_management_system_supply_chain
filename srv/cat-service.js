const cds = require('@sap/cds');
const { SELECT, UPDATE, INSERT } = cds.ql;
require('dotenv').config();
const nodemailer = require('nodemailer')

const { GoogleGenerativeAI } = require("@google/generative-ai");
const SendmailTransport = require('nodemailer/lib/sendmail-transport');

module.exports = class inventoryHandler extends cds.ApplicationService {

  async init() {

    const { products, orders } = this.entities;

    const gmail_pass = process.env.GMAIL_PASS_KEY;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview"
    });

    const transporter = nodemailer.createTransport({

      service: "gmail",
      auth: {
        user: "mithunrajmernfsd@gmail.com",
        pass: gmail_pass
      }
    });


    this.on('CREATE', orders, async (req) => {

      const data = req.data;
      const productID = data.product_ID || data.product?.ID;

      if (!productID) return req.error(400, "Product ID missing");

      const productData = await SELECT.one.from(products).where({ ID: productID });

      if (!productData) return req.error(400, "Product not found");

      const qty = Number(data.quantity);

      if (productData.stock < qty) {
        return req.error(400, "Insufficient stock");
      }

      await UPDATE(products)
        .set({ stock: productData.stock - qty })
        .where({ ID: productID });

      console.log("Stock updated!");

      await INSERT.into(orders).entries(data);

      return data;
    });


    this.after('CREATE', orders, async (data, req) => {

      const payload = req.data;
      const productID = payload.product_ID || payload.product?.ID;

      if (!productID) return;

      const product = await SELECT.one.from(products).where({ ID: productID });

      if (!product) return;

      console.log("Stock after update:", product.stock);

      if (product.stock < 10) {

        const supplier = await SELECT.one.from('inventory.Supplier')
          .where({ ID: product.supplier_ID });

        if (!supplier) return;

        const info = await transporter.sendMail({
          from: "mithunrajmernfsd@gmail.com",
          to: supplier.email,
          subject: "Low Stock Alert",
          text: `
Hello ${supplier.name},

The product "${product.name}" is running low.

Current stock: ${product.stock}

Please restock as soon as possible.

Thanks,
Inventory Management System
      `
        });

        console.log("Email sent:", info.response);
      }

    });
    this.on('askAI', async (req) => {

      const userQuery = req.data.query;

      if (!userQuery) {
        return req.error(400, 'query is required');
      }

      const prompt = `
Convert the following user query into JSON.

Rules:
- entity is products
- detect low stock if mentioned
- detect price conditions:
   - "under 1000" → price_lt = 1000
   - "above 1000" → price_gt = 1000
   - exact price → price = value

Return ONLY JSON:
{
  "price": number OR null,
  "price_lt": number OR null,
  "price_gt": number OR null,
  "low_stock": true OR false
}

User Query:
${userQuery}
`;
      try {

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiText = response.text();

        console.log("AI Raw Response:", aiText);


        let aiData;

        try {
          const cleanText = aiText
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

          aiData = JSON.parse(cleanText);

        } catch (err) {
          console.error("Parse Error:", err);
          return "AI response parsing failed";
        }

        let queryBuilder = SELECT.from(products);
        let conditions = [];

        if (aiData.low_stock === true) {
          conditions.push(`stock < minimum_level`);
        }


        if (aiData.price) {
          conditions.push(`price = ${aiData.price}`);
        }


        if (aiData.price_lt) {
          conditions.push(`price < ${aiData.price_lt}`);
        }


        if (aiData.price_gt) {
          conditions.push(`price > ${aiData.price_gt}`);
        }

        if (conditions.length > 0) {
          queryBuilder.where(conditions.join(" AND "));
        }

        const resultData = await queryBuilder;

        return resultData;

      } catch (error) {
        console.error("AI Error:", error);
        return req.error(500, "AI processing failed");
      }

    });
        
    return super.init();
  }
};

