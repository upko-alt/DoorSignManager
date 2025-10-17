import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, ArrowLeft, GripVertical } from "lucide-react";
import { useLocation } from "wouter";
import type { StatusOption } from "@shared/schema";

export default function AdminStatusOptions() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<StatusOption | null>(null);
  
  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");
  const [sortOrder, setSortOrder] = useState("0");

  const { data: statusOptions = [], isLoading } = useQuery<StatusOption[]>({
    queryKey: ["/api/status-options"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/status-options", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create status option");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/status-options"] });
      resetForm();
      setIsAddDialogOpen(false);
      toast({ title: "Status option created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/status-options/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update status option");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/status-options"] });
      resetForm();
      setEditingOption(null);
      toast({ title: "Status option updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/status-options/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete status option");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/status-options"] });
      toast({ title: "Status option deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setColor("blue");
    setSortOrder("0");
  };

  const handleEdit = (option: StatusOption) => {
    setEditingOption(option);
    setName(option.name);
    setColor(option.color);
    setSortOrder(option.sortOrder);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({ title: "Error", description: "Status name is required", variant: "destructive" });
      return;
    }

    const data = {
      name: name.trim(),
      color,
      sortOrder,
    };

    if (editingOption) {
      updateMutation.mutate({ id: editingOption.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this status option?")) {
      deleteMutation.mutate(id);
    }
  };

  const colorOptions = [
    { value: "blue", label: "Blue" },
    { value: "green", label: "Green" },
    { value: "red", label: "Red" },
    { value: "yellow", label: "Yellow" },
    { value: "purple", label: "Purple" },
    { value: "orange", label: "Orange" },
    { value: "gray", label: "Gray" },
  ];

  const getColorBadgeVariant = (color: string) => {
    switch (color) {
      case "green": return "default";
      case "red": return "destructive";
      case "yellow": return "secondary";
      default: return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Status Options</h1>
            <p className="text-muted-foreground">Manage predefined status choices</p>
          </div>
        </div>
        <Dialog 
          open={isAddDialogOpen} 
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              resetForm();
              setEditingOption(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button data-testid="button-add-status-option">
              <Plus className="h-4 w-4 mr-2" />
              Add Status Option
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-add-status-option">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingOption ? "Edit Status Option" : "Add Status Option"}
                </DialogTitle>
                <DialogDescription>
                  {editingOption 
                    ? "Update the status option details below."
                    : "Create a new predefined status option for members to use."}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Status Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Available, In Meeting"
                    required
                    data-testid="input-status-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger data-testid="select-color">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((option) => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          data-testid={`option-color-${option.value}`}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    placeholder="0"
                    data-testid="input-sort-order"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower numbers appear first
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    resetForm();
                    setEditingOption(null);
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {editingOption ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {statusOptions.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-4">No status options yet</p>
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Status Option
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statusOptions.map((option) => (
                <TableRow key={option.id} data-testid={`row-status-option-${option.id}`}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium" data-testid={`text-name-${option.id}`}>
                    {option.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getColorBadgeVariant(option.color)} data-testid={`badge-color-${option.id}`}>
                      {option.color}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-order-${option.id}`}>
                    {option.sortOrder}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          handleEdit(option);
                          setIsAddDialogOpen(true);
                        }}
                        data-testid={`button-edit-${option.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(option.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${option.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
