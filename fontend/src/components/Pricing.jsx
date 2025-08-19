import React, { useEffect, useState, useCallback} from "react";


// Your existing Pricing component
const Pricing = ({ selectedPackage, setSelectedPackage,  isUpgrade = false }) => {
  const [packages, setPackages] = useState({});
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
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/packages`,
          {
            credentials: "include",
          }
        );
        if (!res.ok) throw new Error("Failed to fetch packages");
        const data = await res.json();
        setPackages(data);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  if (loading) {
    return (
      <section className="py-12 px-4 flex justify-center items-center min-h-[200px] bg-white">
        <div className="w-10 h-10 border-4 border-t-transparent border-black rounded-full animate-spin"></div>
      </section>
    );
  }

  return (
    <section className="py-14 px-4 bg-white">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-light text-black mb-4">
          {isUpgrade ? "Upgrade Your Package" : "Choose Your Package"}
        </h2>
        <p className="text-lg md:text-xl text-gray-600 mb-12 font-light">
          {isUpgrade ? "Select a new plan that fits your growing needs" : "Elegant solutions for every business need"}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.length === 0 ? (
            <p className="col-span-3 text-gray-500 text-center">
              No packages available.
            </p>
          ) : (
            packages.map((pkg, idx) => {
              const meta = packageMeta[pkg.name] || {
                bg: "bg-white",
                border: "border-gray-200",
                textColor: "text-gray-700",
              };
              const isSelected = selectedPackage === pkg.name;
              const isPopular = pkg.name === "standard";

              return (
                <div key={idx} className="relative pt-6">
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-black text-white text-xs md:text-sm font-medium px-4 py-1.5 rounded-full shadow-md z-10 select-none">
                      ★ Most Popular
                    </div>
                  )}
                  <div
                    onClick={() => setSelectedPackage(pkg.name)}
                    className={`cursor-pointer ${meta.bg} ${
                      meta.textColor
                    } border-2 rounded-2xl px-6 py-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl ${
                      isSelected
                        ? "border-black scale-[1.02] shadow-2xl"
                        : meta.border
                    }`}
                  >
                    <div>
                      <h3 className="text-lg md:text-xl font-light mb-2 tracking-wide text-center">
                        {meta.label ?? pkg.name}
                      </h3>

                      <p className="text-2xl font-thin mb-4 text-center break-words">
                        {meta.priceText
                          ? meta.priceText(pkg.amount)
                          : pkg.amount}
                      </p>

                      <ul className="text-sm space-y-2 text-left">
                        {(pkg.features || []).map((feature, index) => (
                          <li key={index} className="flex items-start">
                            <span
                              className={`mr-2 mt-0.5 ${
                                pkg.name === "basic"
                                  ? "text-gray-600"
                                  : "text-white"
                              }`}
                            >
                              ✓
                            </span>
                            <span className="font-light leading-snug">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPackage(pkg.name);
                      }}
                      className={`mt-6 w-full font-medium py-2.5 rounded-lg text-sm transition-all duration-200 ${
                        isSelected
                          ? "bg-black text-white"
                          : pkg.name === "basic"
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




