import React, { useEffect, useState } from "react";

const Pricing = ({ subPackage, setSubPackage }) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const packageMeta = {
    basic: {
      label: "Basic",
      bg: "bg-[#10002B]",
      priceText: (amount) => `LKR ${amount.toLocaleString()}/month`,
    },
    standard: {
      label: "Standard",
      bg: "bg-[#3C096C]",
      priceText: (amount) => `LKR ${amount.toLocaleString()}/month`,
    },
    premium: {
      label: "Premium",
      bg: "bg-[#7B2CBF]",
      priceText: (amount) => `LKR ${amount.toLocaleString()}/month`,
    },
  };

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const packageResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/packages`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (!packageResponse.ok) {
          throw new Error("Failed to fetch packages");
        }

        const packageData = await packageResponse.json();
        setPackages(packageData);
      } catch (error) {
        console.error("Error fetching packages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  if (loading) {
    return (
      <section className="py-12 px-4 flex justify-center items-center min-h-[200px]">
        {/* Simple Tailwind CSS spinner */}
        <div className="w-12 h-12 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
      </section>
    );
  }

  return (
    <section className="py-12 px-4 bg-gradient-to-br from-[#10002B] via-[#5A189A] to-[#E0AAFF] text-white rounded-3xl">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-4">Choose Your Package</h2>
        <p className="text-lg mb-12 text-[#E0AAFF]">Flexible plans for every seller stage</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {packages.length === 0 ? (
            <p>No packages available.</p>
          ) : (
            packages.map((pkg, idx) => {
              const meta = packageMeta[pkg.name] || {};
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
                    className={`cursor-pointer shadow-lg ${meta.bg ?? "bg-[#10002B]"} transition-transform transform hover:scale-105 p-6 flex flex-col justify-between border-4 ${
                      isSelected ? "border-white" : "border-transparent"
                    } rounded-2xl`}
                  >
                    <div>
                      <h3 className="text-2xl font-semibold mb-2">{meta.label ?? pkg.name} Package</h3>
                      <p className="text-xl font-bold mb-4">{meta.priceText ? meta.priceText(pkg.amount) : pkg.amount}</p>
                      <ul className="text-sm space-y-2 text-[#E0AAFF]">
                        {(pkg.features || []).map((feature, index) => (
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
            })
          )}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
