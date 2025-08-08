const ViolationSummary = ({ violations }) => {
  /*const mockViolations = {
    violatedProducts: 5,
    violatedServices: 2,
    violatedProductImages: 12,
    violatedServiceImages: 3,
    violatedHeaderImages: 1,
    violatedVariants: true,
  };

  violations = mockViolations;*/

  return (
    <div className="flex justify-center px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-red-300 mt-4 shadow-lg">
        <h2 className="text-red-700 font-semibold text-2xl mb-4 flex items-center gap-2">
          Plan Limit Violations
        </h2>
        <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
          {violations?.violatedProducts != null && (
            <li>{violations.violatedProducts} extra products above limit</li>
          )}
          {violations?.violatedServices != null && (
            <li>{violations.violatedServices} extra services above limit</li>
          )}
          {violations?.violatedProductImages != null && (
            <li>
              {violations.violatedProductImages} extra product images above
              limit
            </li>
          )}
          {violations?.violatedServiceImages != null && (
            <li>
              {violations.violatedServiceImages} extra service images above
              limit
            </li>
          )}
          {violations?.violatedHeaderImages != null && (
            <li>
              {violations.violatedHeaderImages} extra header images above limit
            </li>
          )}
          {violations?.violatedVariants && (
            <li>Variant usage is not allowed on the selected plan</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ViolationSummary;
