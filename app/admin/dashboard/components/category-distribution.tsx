interface Props {
  data: {
    '5K': number;
    '10K': number;
    'COMMUNITY': number;
  };
}

export default function CategoryDistribution({ data }: Props) {
  const total = data['5K'] + data['10K'] + data.COMMUNITY;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Category Distribution</h3>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>5K</span>
            <span>{data['5K']}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${total > 0 ? (data['5K'] / total) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>10K</span>
            <span>{data['10K']}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${total > 0 ? (data['10K'] / total) * 100 : 0}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Community</span>
            <span>{data.COMMUNITY}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full"
              style={{ width: `${total > 0 ? (data.COMMUNITY / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}