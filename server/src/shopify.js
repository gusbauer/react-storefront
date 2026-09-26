const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;

const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-07";

const SHOPIFY_ENDPOINT = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

export async function getVariantsByIds(variantIds) {
  if (!Array.isArray(variantIds) || variantIds.length === 0) {
    throw new Error("No se han recibido variantes");
  }

  const query = `
  query GetVariants($ids: [ID!]!) @inContext(country: ES) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        availableForSale

        price {
          amount
          currencyCode
        }

        product {
          id
          title
        }
      }
    }
  }
`;

  const response = await fetch(SHOPIFY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },

    body: JSON.stringify({
      query,
      variables: {
        ids: variantIds,
      },
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Shopify HTTP ${response.status}`);
  }

  if (result.errors) {
    console.error("Errores GraphQL Shopify:", result.errors);

    throw new Error("Shopify ha rechazado la consulta");
  }

  return result.data.nodes.filter(Boolean);
}
