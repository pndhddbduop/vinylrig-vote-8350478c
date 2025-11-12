"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

type DecryptedResults = {
  setupIndex: number;
  equipmentName: string;
  averageRating: number;
  totalVotes: number;
  tagScores: number[];
};

const TAG_LABELS = ["Bass", "Midrange", "Treble", "Soundstage", "Detail"];

/**
 * ResultsCharts - Visualization component for voting results
 * Displays bar charts and radar charts for session statistics
 */
export function ResultsCharts({ results }: { results: DecryptedResults[] }) {
  // Prepare data for average rating bar chart
  const ratingData = results.map((r) => ({
    name: r.equipmentName,
    rating: r.averageRating.toFixed(2),
    votes: r.totalVotes,
  }));

  // Prepare data for radar chart (frequency response profile)
  const radarData = TAG_LABELS.map((label, tagIndex) => {
    const dataPoint: any = { tag: label };
    results.forEach((setup) => {
      const avgTagScore = setup.totalVotes > 0 
        ? setup.tagScores[tagIndex] / setup.totalVotes 
        : 0;
      dataPoint[setup.equipmentName] = avgTagScore.toFixed(2);
    });
    return dataPoint;
  });

  // Sort results by average rating for ranking
  const rankedResults = [...results].sort((a, b) => b.averageRating - a.averageRating);

  return (
    <div className="space-y-8">
      {/* Rankings Table */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-2xl font-heading font-bold mb-6">Final Rankings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-heading">Rank</th>
                <th className="text-left py-3 px-4 font-heading">Equipment</th>
                <th className="text-right py-3 px-4 font-heading">Avg Rating</th>
                <th className="text-right py-3 px-4 font-heading">Total Votes</th>
              </tr>
            </thead>
            <tbody>
              {rankedResults.map((result, index) => (
                <tr key={result.setupIndex} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-4">
                    <span className="text-2xl font-bold">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-medium">{result.equipmentName}</td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-lg font-bold text-primary">
                      {result.averageRating.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground text-sm"> / 10</span>
                  </td>
                  <td className="py-4 px-4 text-right text-muted-foreground">
                    {result.totalVotes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Average Rating Bar Chart */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-2xl font-heading font-bold mb-6">Average Ratings Comparison</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={ratingData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              stroke="hsl(var(--foreground))"
            />
            <YAxis 
              domain={[0, 10]} 
              stroke="hsl(var(--foreground))"
              label={{ value: 'Rating (1-10)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar 
              dataKey="rating" 
              fill="hsl(var(--primary))" 
              name="Average Rating"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Frequency Response Radar Chart */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-2xl font-heading font-bold mb-6">Frequency Response & Sonic Profile</h2>
        <p className="text-muted-foreground mb-6">
          Radar chart showing the average preference scores across different frequency ranges and sonic characteristics.
        </p>
        <ResponsiveContainer width="100%" height={500}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="tag" 
              stroke="hsl(var(--foreground))"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 1]}
              stroke="hsl(var(--foreground))"
            />
            {results.map((setup, index) => (
              <Radar
                key={setup.setupIndex}
                name={setup.equipmentName}
                dataKey={setup.equipmentName}
                stroke={`hsl(${(index * 360) / results.length}, 70%, 50%)`}
                fill={`hsl(${(index * 360) / results.length}, 70%, 50%)`}
                fillOpacity={0.3}
              />
            ))}
            <Legend />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Tag Scores Detail */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-2xl font-heading font-bold mb-6">Detailed Tag Scores</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((result) => (
            <div key={result.setupIndex} className="border border-border rounded-lg p-4">
              <h3 className="font-heading font-bold mb-4">{result.equipmentName}</h3>
              <div className="space-y-3">
                {TAG_LABELS.map((label, tagIndex) => {
                  const avgScore = result.totalVotes > 0 
                    ? result.tagScores[tagIndex] / result.totalVotes 
                    : 0;
                  return (
                    <div key={tagIndex}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{avgScore.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${(avgScore * 100).toFixed(0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

