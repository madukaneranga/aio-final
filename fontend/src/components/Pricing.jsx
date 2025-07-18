import React from "react";

const Pricing = ({ subPackage, setSubPackage }) => {
  const packages = [
  {
    name: "basic",
    label: "Basic",
    price: "LKR 1,500/month",
    bg: "bg-[#10002B]",
    features: [
      "List up to 8 products/services",
      "3 images per item",
      "Custom banner & logo",
      "2 header visuals",
      "Order & booking tools",
    ],
  },
  {
    name: "standard",
    label: "Standard",
    price: "LKR 3,500/month",
    bg: "bg-[#3C096C]",
    features: [
      "List up to 25 products/services",
      "5 images per item",
      "Custom banner & logo",
      "5 header visuals",
      "Order & booking tools",
      "Theme color options",
      "Variants (size, color)",
      "24/5 WhatsApp support",
    ],
  },
  {
    name: "premium",
    label: "Premium",
    price: "LKR 6,500/month",
    bg: "bg-[#7B2CBF]",
    features: [
      "Unlimited products/services",
      "5 images per item",
      "Custom banner & logo",
      "5 header visuals",
      "Order & booking tools",
      "Theme color options",
      "Variants (size, color)",
      "Advanced analytics",
      "Branded invoices",
      "Custom QR store card",
      "24/7 WhatsApp/Call support",
    ],
  },
];

  return (
 <section className="py-12 px-4 bg-gradient-to-br from-[#10002B] via-[#5A189A] to-[#E0AAFF] text-white rounded-3xl">
  <div className="max-w-7xl mx-auto text-center">
    <h2 className="text-4xl font-bold mb-4">Choose Your Package</h2>
    <p className="text-lg mb-12 text-[#E0AAFF]">Flexible plans for every seller stage</p>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {packages.map((pkg, idx) => {
        const isSelected = subPackage === pkg.name;
        const isPopular = pkg.name === "standard";

        return (
          <div key={idx} className="relative rounded-2xl">
            {isPopular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#7B2CBF] text-[#E0AAFF] text-xs font-bold px-4 py-1 rounded-full shadow-md z-10 select-none">
                ★ Popular
              </div>
            )}

            <div
              onClick={() => setSubPackage(pkg.name)}
              className={`cursor-pointer shadow-lg ${pkg.bg} transition-transform transform hover:scale-105 p-6 flex flex-col justify-between border-4 ${
                isSelected ? "border-white" : "border-transparent"
              } rounded-2xl`}
            >
              <div>
                <h3 className="text-2xl font-semibold mb-2">{pkg.label} Package</h3>
                <p className="text-xl font-bold mb-4">{pkg.price}</p>
                <ul className="text-sm space-y-2 text-[#E0AAFF]">
                  {pkg.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-white mr-2">✔</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSubPackage(pkg.name);
                }}
                className={`mt-6 font-semibold py-2 px-4 rounded-xl transition ${
                  isSelected
                    ? "bg-white text-[#10002B]"
                    : "bg-white text-[#5A189A] hover:bg-[#E0AAFF] hover:text-[#10002B]"
                }`}
              >
                {isSelected ? "Selected" : "Get Started"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
</section>

  );
};

export default Pricing;
