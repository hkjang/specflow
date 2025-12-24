
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageGuide } from "@/components/common/PageGuide";

export default function QualityReportsPage() {
    return (
        <div className="space-y-6">
            <PageGuide
                title="Data Quality Reports"
                description="View quality metrics for data in the Data Mart."
                purpose="Ensure data integrity and completeness."
            />
            <Card>
                <CardHeader>
                    <CardTitle>Latest Quality Scan</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Quality Score: 98%</p>
                </CardContent>
            </Card>
        </div>
    );
}
