const STOREFRONT_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;

const SHOPIFY_ENDPOINT = "/shopify-api/api/2026-07/graphql.json";

export async function getProducts() {
  const query = `
  query @inContext(country: ES) {
    products(
      first: 10
      query: "title:Camiseta G Store"
    ) {
      nodes {
        id
        title
        handle
        availableForSale

        images(first: 1) {
          nodes {
            url
            altText
          }
        }

        variants(first: 1) {
          nodes {
            id
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

  console.log("Token existe:", Boolean(STOREFRONT_TOKEN));

  console.log("Longitud token:", STOREFRONT_TOKEN?.length);

  const response = await fetch(SHOPIFY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query }),
  });

  const text = await response.text();

  console.log("HTTP Shopify:", response.status);
  console.log("Respuesta Shopify:", text);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} - ${text}`);
  }

  const result = JSON.parse(text);

  if (result.errors) {
    throw new Error(JSON.stringify(result.errors));
  }

  return result.data.products.nodes;
}
