
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageGuide } from "@/components/common/PageGuide";

export default function HeatmapPage() {
    return (
        <div className="space-y-6">
            <PageGuide
                title="Confidence Heatmap"
                description="Visual representation of AI classification confidence."
                purpose="Identify areas where AI is uncertain."
            />
            <Card>
                <CardHeader>
                    <CardTitle>Confidence Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64 flex items-center justify-center bg-muted/20 rounded-md border border-dashed">
                        Visualization Placeholder
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
