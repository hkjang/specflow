
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageGuide } from "@/components/common/PageGuide";

export default function OverrideQueuePage() {
    return (
        <div className="space-y-6">
            <PageGuide
                title="Override Queue"
                description="Review requirements with low classification confidence."
                purpose="Manually correct AI classifications."
            />
            <Card>
                <CardHeader>
                    <CardTitle>Pending Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No items in the queue.</p>
                </CardContent>
            </Card>
        </div>
    );
}
