import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface PostManagementProps {
  userId: string;
}

const PostManagement = ({ userId }: PostManagementProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Post Management
        </CardTitle>
        <CardDescription>
          Manage all posts across your community rooms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <p>No posts yet</p>
          <p className="text-sm mt-2">Posts will appear here once you start sharing content with your community</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostManagement;
