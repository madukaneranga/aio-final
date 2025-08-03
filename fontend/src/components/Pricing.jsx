import React, { useEffect, useState } from "react";

const Pricing = ({ subPackage, setSubPackage }) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const packageMeta = {
    basic: {
      label: "Basic",
      bg: "bg-white",
      border: "border-gray-200",
      textColor: "text-gray-700",
      priceText: (amount) => `LKR ${amount.toLocaleString()}/month`,
    },
    standard: {
      label: "Standard",
      bg: "bg-black",
      border: "border-black",
      textColor: "text-white",
      priceText: (amount) => `LKR ${amount.toLocaleString()}/month`,
    },
    premium: {
      label: "Premium",
      bg: "bg-gradient-to-br from-gray-900 to-black",
      border: "border-gray-800",
      textColor: "text-white",
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
      <section className="py-12 px-4 flex justify-center items-center min-h-[200px] bg-white">
        <div className="w-12 h-12 border-4 border-t-transparent border-black rounded-full animate-spin"></div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-5xl font-light mb-6 text-black tracking-tight">Choose Your Package</h2>
        <p className="text-xl mb-16 text-gray-600 font-light">Elegant solutions for every business need</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {packages.length === 0 ? (
            <p className="text-gray-500 col-span-3">No packages available.</p>
          ) : (
            packages.map((pkg, idx) => {
              const meta = packageMeta[pkg.name] || {
                bg: "bg-white",
                border: "border-gray-200",
                textColor: "text-gray-700",
              };
              const isSelected = subPackage === pkg.name;
              const isPopular = pkg.name === "standard";

              return (
                <div key={idx} className="relative">
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-black text-white text-sm font-medium px-6 py-2 rounded-full shadow-lg z-10 select-none">
                      ★ Most Popular
                    </div>
                  )}

                  <div
                    onClick={() => setSubPackage(pkg.name)}
                    className={`cursor-pointer h-full ${meta.bg} ${meta.textColor} transition-all duration-300 transform hover:scale-105 hover:shadow-2xl p-8 flex flex-col justify-between border-2 ${
                      isSelected ? "border-black shadow-2xl scale-105" : meta.border
                    } rounded-3xl ${isPopular ? "shadow-xl" : "shadow-lg"}`}
                  >
                    <div className="flex-grow">
                      <h3 className="text-2xl font-light mb-4 tracking-wide">
                        {meta.label ?? pkg.name}
                      </h3>
                      <div className="mb-8">
                        <p className="text-4xl font-thin mb-2">
                          {meta.priceText ? meta.priceText(pkg.amount) : pkg.amount}
                        </p>
                      </div>
                      <ul className="text-sm space-y-4 text-left">
                        {(pkg.features || []).map((feature, index) => (
                          <li key={index} className="flex items-start">
                            <span className={`mr-3 mt-0.5 ${pkg.name === 'basic' ? 'text-gray-600' : 'text-white'}`}>
                              ✓
                            </span>
                            <span className="font-light leading-relaxed">{feature}</span>
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
                      className={`mt-8 font-medium py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                        isSelected
                          ? pkg.name === 'basic'
                            ? "bg-black text-white shadow-lg"
                            : "bg-white text-black shadow-lg"
                          : pkg.name === 'basic'
                          ? "bg-black text-white hover:bg-gray-800"
                          : "bg-white text-black hover:bg-gray-100 border border-gray-300"
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